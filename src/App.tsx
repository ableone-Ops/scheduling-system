import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  App as AntdApp,
  Badge,
  Button,
  DatePicker,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Layout,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
  RetweetOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/zh-cn';
import { createId, createInitialData, DEFAULT_BASE_NAME } from './constants';
import { loadData, saveData } from './storage';
import type { Location, Member, ScheduleTask } from './types';
import { enumerateDays, getWeekRange, toDateString } from './utils/date';
import { exportScheduleExcel } from './utils/excel';
import {
  copyTask,
  copyTasksFromPreviousWeek,
  copyMembersToNextDay,
  detectConflicts,
  getLocationCellText,
  getMemberCellText,
} from './utils/schedule';
import { bySortOrder, moveItemToPosition, normalizeSortOrders } from './utils/sort';

dayjs.locale('zh-cn');

type TaskFormValue = {
  locationId: string;
  taskName: string;
  dateRange: [Dayjs, Dayjs];
  memberIds: string[];
};

const { Header, Content } = Layout;

const renderMultiline = (text: string, danger = false) => (
  <div className={danger ? 'cell-text conflict-cell' : 'cell-text'}>
    {text || <span className="muted">-</span>}
  </div>
);

export default function App() {
  const [data, setData] = useState(loadData);
  const [activeTab, setActiveTab] = useState('schedule');
  const initialWeek = getWeekRange(dayjs());
  const [startDate, setStartDate] = useState(initialWeek.start);
  const [endDate, setEndDate] = useState(initialWeek.end);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm] = Form.useForm<TaskFormValue>();
  const [memberForm] = Form.useForm<Partial<Member>>();
  const [locationForm] = Form.useForm<Partial<Location>>();

  useEffect(() => {
    saveData(data);
  }, [data]);

  const days = useMemo(() => enumerateDays(startDate, endDate), [startDate, endDate]);
  const orderedMembers = useMemo(() => bySortOrder(data.members), [data.members]);
  const enabledMembers = useMemo(() => orderedMembers.filter((member) => member.enabled), [orderedMembers]);
  const orderedLocations = useMemo(() => bySortOrder(data.locations), [data.locations]);
  const enabledLocations = useMemo(() => orderedLocations.filter((location) => location.enabled), [orderedLocations]);
  const conflicts = useMemo(
    () => detectConflicts(data.tasks, data.members, data.locations, days),
    [data.tasks, data.members, data.locations, days],
  );

  const conflictKeySet = useMemo(() => {
    const set = new Set<string>();
    conflicts.forEach((conflict) => set.add(`${conflict.date}-${conflict.memberId}`));
    return set;
  }, [conflicts]);

  const updateData = (updater: typeof setData extends (value: infer T) => void ? T : never) => {
    setData(updater);
  };

  const openCreateTask = () => {
    setEditingTaskId(null);
    taskForm.setFieldsValue({
      locationId: enabledLocations.find((location) => !location.isDefaultBase)?.id ?? enabledLocations[0]?.id,
      taskName: '',
      dateRange: [dayjs(startDate), dayjs(startDate)],
      memberIds: [],
    });
    setTaskModalOpen(true);
  };

  const openEditTask = (task: ScheduleTask) => {
    setEditingTaskId(task.id);
    taskForm.setFieldsValue({
      locationId: task.locationId,
      taskName: task.taskName,
      dateRange: [dayjs(task.startDate), dayjs(task.endDate)],
      memberIds: task.memberIds,
    });
    setTaskModalOpen(true);
  };

  const submitTask = async () => {
    const values = await taskForm.validateFields();
    const nextTask: ScheduleTask = {
      id: editingTaskId ?? createId(),
      locationId: values.locationId,
      taskName: values.taskName.trim(),
      startDate: toDateString(values.dateRange[0]),
      endDate: toDateString(values.dateRange[1]),
      memberIds: values.memberIds,
    };

    setData((current) => ({
      ...current,
      tasks: editingTaskId
        ? current.tasks.map((task) => (task.id === editingTaskId ? nextTask : task))
        : [...current.tasks, nextTask],
    }));
    setTaskModalOpen(false);
    message.success(editingTaskId ? '任务已更新' : '任务已新增');
  };

  const deleteTask = (taskId: string) => {
    setData((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId),
    }));
  };

  const handleExport = () => {
    if (conflicts.length) {
      message.error('存在人员冲突，已禁止导出');
      return;
    }
    exportScheduleExcel(days, data.locations, data.members, data.tasks);
    message.success('Excel 已导出');
  };

  const moveMember = (member: Member, target: number) => {
    setData((current) => ({
      ...current,
      members: moveItemToPosition(current.members, member.sortOrder, target),
    }));
  };

  const moveLocation = (location: Location, target: number) => {
    setData((current) => ({
      ...current,
      locations: moveItemToPosition(current.locations, location.sortOrder, target),
    }));
  };

  const submitMember = async () => {
    const values = await memberForm.validateFields();
    const editingId = values.id;
    setData((current) => {
      const nextMembers = editingId
        ? current.members.map((member) => (member.id === editingId ? { ...member, ...values, name: values.name!.trim() } : member))
        : [
            ...current.members,
            {
              id: createId(),
              name: values.name!.trim(),
              position: values.position?.trim(),
              enabled: values.enabled ?? true,
              sortOrder: current.members.length + 1,
            },
          ];
      return { ...current, members: normalizeSortOrders(nextMembers) };
    });
    memberForm.resetFields();
  };

  const submitLocation = async () => {
    const values = await locationForm.validateFields();
    const editingId = values.id;
    setData((current) => {
      const nextLocations = editingId
        ? current.locations.map((location) =>
            location.id === editingId
              ? { ...location, name: values.name!.trim(), enabled: values.enabled ?? true }
              : location,
          )
        : [
            ...current.locations,
            {
              id: createId(),
              name: values.name!.trim(),
              enabled: values.enabled ?? true,
              sortOrder: current.locations.length + 1,
            },
          ];
      return { ...current, locations: normalizeSortOrders(nextLocations) };
    });
    locationForm.resetFields();
  };

  const scheduleTaskColumns: ColumnsType<ScheduleTask> = [
    {
      title: '地点',
      dataIndex: 'locationId',
      width: 130,
      render: (id) => data.locations.find((location) => location.id === id)?.name ?? '未知地点',
    },
    { title: '任务', dataIndex: 'taskName', width: 180 },
    {
      title: '日期',
      width: 180,
      render: (_, task) => `${task.startDate} 至 ${task.endDate}`,
    },
    {
      title: '人员',
      dataIndex: 'memberIds',
      render: (ids: string[]) =>
        ids
          .map((id) => data.members.find((member) => member.id === id)?.name)
          .filter(Boolean)
          .join('、'),
    },
    {
      title: '操作',
      width: 280,
      fixed: 'right',
      render: (_, task) => (
        <Space>
          <Button title="编辑任务" icon={<EditOutlined />} onClick={() => openEditTask(task)} />
          <Button
            title="复制当前任务"
            icon={<CopyOutlined />}
            onClick={() => {
              setData((current) => ({ ...current, tasks: [...current.tasks, copyTask(task)] }));
              message.success('已复制任务');
            }}
          />
          <Button
            title="复制到下一天"
            icon={<RetweetOutlined />}
            onClick={() => {
              setData((current) => ({ ...current, tasks: copyMembersToNextDay(task, current.tasks) }));
              message.success('已复制到下一天');
            }}
          />
          <Popconfirm title="删除该任务？" onConfirm={() => deleteTask(task.id)}>
            <Button title="删除任务" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const locationViewColumns: ColumnsType<Location> = [
    { title: '工作地点', dataIndex: 'name', width: 150, fixed: 'left' },
    ...days.map((day) => ({
      title: day.label,
      dataIndex: day.date,
      width: 220,
      render: (_: unknown, location: Location) => {
        const text = getLocationCellText(location, day.date, data.tasks, data.locations, data.members);
        const danger = conflicts.some(
          (conflict) => conflict.date === day.date && conflict.locationNames.includes(location.name),
        );
        return renderMultiline(text, danger);
      },
    })),
  ];

  const memberViewColumns: ColumnsType<Member> = [
    { title: '人员', dataIndex: 'name', width: 120, fixed: 'left' },
    ...days.map((day) => ({
      title: day.label,
      dataIndex: day.date,
      width: 180,
      render: (_: unknown, member: Member) =>
        renderMultiline(getMemberCellText(member.id, day.date, data.tasks, data.locations), conflictKeySet.has(`${day.date}-${member.id}`)),
    })),
  ];

  const memberColumns: ColumnsType<Member> = [
    { title: '序号', dataIndex: 'sortOrder', width: 80 },
    { title: '姓名', dataIndex: 'name', width: 130 },
    { title: '岗位', dataIndex: 'position', width: 160, render: (value) => value || '-' },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 100,
      render: (_, member) => (
        <Switch
          checked={member.enabled}
          onChange={(checked) =>
            setData((current) => ({
              ...current,
              members: current.members.map((item) => (item.id === member.id ? { ...item, enabled: checked } : item)),
            }))
          }
        />
      ),
    },
    {
      title: '排序',
      width: 260,
      render: (_, member) => (
        <Space>
          <Button title="上移" icon={<ArrowUpOutlined />} disabled={member.sortOrder === 1} onClick={() => moveMember(member, member.sortOrder - 1)} />
          <Button title="下移" icon={<ArrowDownOutlined />} disabled={member.sortOrder === data.members.length} onClick={() => moveMember(member, member.sortOrder + 1)} />
          <InputNumber
            min={1}
            max={data.members.length}
            value={member.sortOrder}
            onPressEnter={(event) => moveMember(member, Number((event.target as HTMLInputElement).value))}
            onBlur={(event) => moveMember(member, Number(event.target.value))}
          />
        </Space>
      ),
    },
    {
      title: '操作',
      width: 150,
      render: (_, member) => (
        <Space>
          <Button icon={<EditOutlined />} title="编辑成员" onClick={() => memberForm.setFieldsValue(member)} />
          <Popconfirm title="删除该成员？已有关联任务中的该人员也会移除。" onConfirm={() => {
            setData((current) => ({
              ...current,
              members: normalizeSortOrders(current.members.filter((item) => item.id !== member.id)),
              tasks: current.tasks.map((task) => ({
                ...task,
                memberIds: task.memberIds.filter((id) => id !== member.id),
              })),
            }));
          }}>
            <Button danger icon={<DeleteOutlined />} title="删除成员" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const locationColumns: ColumnsType<Location> = [
    { title: '序号', dataIndex: 'sortOrder', width: 80 },
    {
      title: '地点',
      dataIndex: 'name',
      width: 180,
      render: (name, location) => (
        <Space>
          <span>{name}</span>
          {location.isDefaultBase && <Tag color="blue">默认基地</Tag>}
        </Space>
      ),
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 100,
      render: (_, location) => (
        <Switch
          checked={location.enabled}
          disabled={location.isDefaultBase}
          onChange={(checked) =>
            setData((current) => ({
              ...current,
              locations: current.locations.map((item) => (item.id === location.id ? { ...item, enabled: checked } : item)),
            }))
          }
        />
      ),
    },
    {
      title: '排序',
      width: 260,
      render: (_, location) => (
        <Space>
          <Button title="上移" icon={<ArrowUpOutlined />} disabled={location.sortOrder === 1} onClick={() => moveLocation(location, location.sortOrder - 1)} />
          <Button title="下移" icon={<ArrowDownOutlined />} disabled={location.sortOrder === data.locations.length} onClick={() => moveLocation(location, location.sortOrder + 1)} />
          <InputNumber
            min={1}
            max={data.locations.length}
            value={location.sortOrder}
            onPressEnter={(event) => moveLocation(location, Number((event.target as HTMLInputElement).value))}
            onBlur={(event) => moveLocation(location, Number(event.target.value))}
          />
        </Space>
      ),
    },
    {
      title: '操作',
      width: 150,
      render: (_, location) => (
        <Space>
          <Button icon={<EditOutlined />} title="编辑地点" onClick={() => locationForm.setFieldsValue(location)} />
          <Popconfirm title="删除该地点？关联任务也会删除。" disabled={location.isDefaultBase} onConfirm={() => {
            setData((current) => ({
              ...current,
              locations: normalizeSortOrders(current.locations.filter((item) => item.id !== location.id)),
              tasks: current.tasks.filter((task) => task.locationId !== location.id),
            }));
          }}>
            <Button danger disabled={location.isDefaultBase} icon={<DeleteOutlined />} title="删除地点" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const schedulePanel = (
    <Space direction="vertical" size={16} className="panel-stack">
      <Flex justify="space-between" align="center" gap={16} wrap>
        <Space wrap>
          <DatePicker
            value={dayjs(startDate)}
            allowClear={false}
            onChange={(value) => {
              const range = getWeekRange(value);
              setStartDate(range.start);
              setEndDate(range.end);
            }}
          />
          <DatePicker.RangePicker
            value={[dayjs(startDate), dayjs(endDate)]}
            allowClear={false}
            onChange={(values) => {
              if (!values?.[0] || !values[1]) return;
              setStartDate(toDateString(values[0]));
              setEndDate(toDateString(values[1]));
            }}
          />
          <Button
            icon={<CopyOutlined />}
            onClick={() => {
              setData((current) => ({
                ...current,
                tasks: copyTasksFromPreviousWeek(current.tasks, startDate, endDate),
              }));
              message.success('已复制上周排班');
            }}
          >
            复制上周排班
          </Button>
        </Space>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateTask}>新增任务</Button>
          <Button icon={<DownloadOutlined />} disabled={conflicts.length > 0} onClick={handleExport}>导出Excel</Button>
        </Space>
      </Flex>

      {conflicts.length ? (
        <Alert
          type="error"
          showIcon
          message={`发现 ${conflicts.length} 项人员冲突，已禁止导出 Excel`}
          description={<Space direction="vertical">{conflicts.map((conflict) => <span key={`${conflict.date}-${conflict.memberId}`}>{conflict.message}</span>)}</Space>}
        />
      ) : (
        <Alert type="success" showIcon message="排班校核通过，未发现同一人员同一天跨地点冲突。" />
      )}

      <Table
        rowKey="id"
        size="middle"
        columns={scheduleTaskColumns}
        dataSource={data.tasks}
        pagination={{ pageSize: 6 }}
        scroll={{ x: 980 }}
      />

      <Tabs
        items={[
          {
            key: 'location',
            label: '排班总览',
            children: (
              <Table
                rowKey="id"
                bordered
                size="small"
                columns={locationViewColumns}
                dataSource={enabledLocations}
                pagination={false}
                scroll={{ x: 150 + days.length * 220, y: 460 }}
              />
            ),
          },
          {
            key: 'member',
            label: '人员视图',
            children: (
              <Table
                rowKey="id"
                bordered
                size="small"
                columns={memberViewColumns}
                dataSource={enabledMembers}
                pagination={false}
                scroll={{ x: 120 + days.length * 180, y: 460 }}
              />
            ),
          },
        ]}
      />
    </Space>
  );

  const memberPanel = (
    <Space direction="vertical" size={16} className="panel-stack">
      <Form form={memberForm} layout="inline" initialValues={{ enabled: true }} onFinish={submitMember}>
        <Form.Item name="id" hidden><Input /></Form.Item>
        <Form.Item name="name" rules={[{ required: true, message: '请输入姓名' }]}>
          <Input placeholder="姓名" />
        </Form.Item>
        <Form.Item name="position">
          <Input placeholder="岗位" />
        </Form.Item>
        <Form.Item name="enabled" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>保存成员</Button>
        <Button onClick={() => memberForm.resetFields()}>清空</Button>
      </Form>
      <Table rowKey="id" columns={memberColumns} dataSource={orderedMembers} pagination={false} scroll={{ y: 620, x: 980 }} />
    </Space>
  );

  const locationPanel = (
    <Space direction="vertical" size={16} className="panel-stack">
      <Form form={locationForm} layout="inline" initialValues={{ enabled: true }} onFinish={submitLocation}>
        <Form.Item name="id" hidden><Input /></Form.Item>
        <Form.Item name="name" rules={[{ required: true, message: '请输入地点名称' }]}>
          <Input placeholder="工作地点" />
        </Form.Item>
        <Form.Item name="enabled" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>保存地点</Button>
        <Button onClick={() => locationForm.resetFields()}>清空</Button>
      </Form>
      <Table rowKey="id" columns={locationColumns} dataSource={orderedLocations} pagination={false} scroll={{ y: 620, x: 820 }} />
    </Space>
  );

  return (
    <AntdApp>
      <Layout className="app-layout">
        <Header className="app-header">
          <Flex justify="space-between" align="center">
            <Space size={16}>
              <Typography.Title level={3} className="app-title">班组周排班管理系统</Typography.Title>
              <Badge status={conflicts.length ? 'error' : 'success'} text={conflicts.length ? '存在冲突' : '校核通过'} />
            </Space>
            <Space>
              <Typography.Text className="header-stat">启用人员 {enabledMembers.length} / 地点 {enabledLocations.length}</Typography.Text>
              <Popconfirm title="恢复默认成员、地点和示例任务？当前本地数据会被覆盖。" onConfirm={() => {
                setData(createInitialData());
                message.success('已恢复示例数据');
              }}>
                <Button>恢复示例数据</Button>
              </Popconfirm>
            </Space>
          </Flex>
        </Header>
        <Content className="app-content">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              { key: 'schedule', label: '排班主页', children: schedulePanel },
              { key: 'members', label: '班组成员库', children: memberPanel },
              { key: 'locations', label: '工作地点库', children: locationPanel },
            ]}
          />
        </Content>
      </Layout>

      <Modal
        title={editingTaskId ? '编辑任务' : '新增任务'}
        open={taskModalOpen}
        onCancel={() => setTaskModalOpen(false)}
        onOk={submitTask}
        width={680}
        destroyOnHidden
      >
        <Divider />
        <Form form={taskForm} layout="vertical">
          <Form.Item name="locationId" label="工作地点" rules={[{ required: true, message: '请选择工作地点' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={enabledLocations.map((location) => ({ label: location.name, value: location.id }))}
            />
          </Form.Item>
          <Form.Item name="taskName" label="工作任务" rules={[{ required: true, message: '请输入工作任务' }]}>
            <Input placeholder="例如：年检配合" />
          </Form.Item>
          <Form.Item name="dateRange" label="开始日期 / 结束日期" rules={[{ required: true, message: '请选择日期范围' }]}>
            <DatePicker.RangePicker allowClear={false} />
          </Form.Item>
          <Form.Item name="memberIds" label="作业人员" rules={[{ required: true, message: '请选择作业人员' }]}>
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              placeholder="选择人员"
              options={orderedMembers
                .filter((member) => member.enabled)
                .map((member) => ({ label: member.name, value: member.id }))}
            />
          </Form.Item>
          <Alert
            type="info"
            showIcon
            message={`${DEFAULT_BASE_NAME}会自动承接每天未安排的启用人员，停用人员不参与自动归入。`}
          />
        </Form>
      </Modal>
    </AntdApp>
  );
}
